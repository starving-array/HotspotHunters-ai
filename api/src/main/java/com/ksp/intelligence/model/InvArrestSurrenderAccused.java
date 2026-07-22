package com.ksp.intelligence.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Entity
@Table(name = "inv_arrestsurrenderaccused")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@IdClass(InvArrestSurrenderAccused.Key.class)
public class InvArrestSurrenderAccused {

    @Id
    @Column(name = "arrestsurrenderid")
    private Integer arrestSurrenderId;

    @Id
    @Column(name = "accusedmasterid")
    private Integer accusedMasterId;

    @Embeddable
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
    public static class Key implements Serializable {
        private static final long serialVersionUID = 1L;
        private Integer arrestSurrenderId;
        private Integer accusedMasterId;
    }
}