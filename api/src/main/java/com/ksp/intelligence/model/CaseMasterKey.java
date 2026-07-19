package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDate;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CaseMasterKey implements Serializable {
    private static final long serialVersionUID = 1L;

    @Column(name = "CaseMasterID")
    private Integer caseMasterID;

    @Column(name = "CrimeRegisteredDate")
    private LocalDate crimeRegisteredDate;
}